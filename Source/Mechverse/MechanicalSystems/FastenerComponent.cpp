#include "MechanicalSystems/FastenerComponent.h"

UFastenerComponent::UFastenerComponent()
	: CurrentAppliedTorqueNm(0.0f)
	, CurrentEngagementMm(20.0f) // fully threaded by default
	, bIsStrippedOrYielded(false)
	, bIsFullyTorqued(false)
{
	PrimaryComponentTick.bCanEverTick = false;
}

float UFastenerComponent::CalculateClampingForceNewtons() const
{
	if (bIsStrippedOrYielded || CurrentAppliedTorqueNm <= 0.0f)
	{
		return 0.0f;
	}

	// Engineering Formula (Approximation): F_clamp = T / (K * d)
	// where d is in meters (NominalDiameterMm / 1000.0)
	// Note: Actual preload varies with thread pitch, lubrication, friction angle, and lead.
	const float DiameterMeters = Spec.NominalDiameterMm / 1000.0f;
	if (DiameterMeters <= 0.0f || Spec.TorqueCoefficientK <= 0.0f)
	{
		return 0.0f;
	}

	return CurrentAppliedTorqueNm / (Spec.TorqueCoefficientK * DiameterMeters);
}

float UFastenerComponent::AdvanceThread(float Turns, FText& OutMessage)
{
	if (bIsStrippedOrYielded)
	{
		OutMessage = FText::FromString(TEXT("Threads stripped. Bolt spins freely without axial engagement advance."));
		return CurrentEngagementMm;
	}

	// Axial advance = pitch * turns
	const float DeltaMm = Turns * Spec.ThreadPitchMm;
	CurrentEngagementMm = FMath::Clamp(CurrentEngagementMm + DeltaMm, 0.0f, Spec.EngagementLengthMm);

	if (CurrentEngagementMm <= 0.0f)
	{
		CurrentAppliedTorqueNm = 0.0f;
		bIsFullyTorqued = false;
		OutMessage = FText::FromString(TEXT("Fastener completely unthreaded and disengaged. Ready for removal."));
	}
	else if (CurrentEngagementMm >= Spec.EngagementLengthMm)
	{
		OutMessage = FText::FromString(TEXT("Fastener fully seated. Ready for torque application."));
	}
	else
	{
		OutMessage = FText::FromString(FString::Printf(TEXT("Thread engagement: %.2f / %.2f mm"), CurrentEngagementMm, Spec.EngagementLengthMm));
	}

	return CurrentEngagementMm;
}

bool UFastenerComponent::CanRemove(FText& OutReason) const
{
	if (CurrentEngagementMm > 0.0f)
	{
		OutReason = FText::FromString(FString::Printf(TEXT("Fastener still engaged in threads (%.1f mm remaining). Unthread completely first."), CurrentEngagementMm));
		return false;
	}
	OutReason = FText::FromString(TEXT("Fastener is completely disengaged."));
	return true;
}

bool UFastenerComponent::ApplyTorque(float AppliedTorqueNm, FText& OutMessage)
{
	if (AppliedTorqueNm < 0.0f)
	{
		OutMessage = FText::FromString(TEXT("Invalid negative torque value specified."));
		return false;
	}

	if (CurrentEngagementMm < (Spec.EngagementLengthMm * 0.75f))
	{
		OutMessage = FText::FromString(TEXT("Cannot torque fastener: threads are not fully seated and engaged!"));
		return false;
	}

	if (bIsStrippedOrYielded)
	{
		OutMessage = FText::FromString(TEXT("Fastener thread is stripped! Cannot hold torque."));
		return false;
	}

	CurrentAppliedTorqueNm = AppliedTorqueNm;

	// Check if torque exceeds yield limit
	if (CurrentAppliedTorqueNm > Spec.YieldTorqueLimitNm)
	{
		bIsStrippedOrYielded = true;
		bIsFullyTorqued = false;
		CurrentAppliedTorqueNm = 0.0f;
		OutMessage = FText::FromString(TEXT("WARNING: Fastener over-torqued! Threads sheared/yielded."));
		return false;
	}

	// Check if within manufacturer specified tolerance (+/- 10%)
	const float LowerLimit = Spec.TargetTorqueNm * 0.90f;
	const float UpperLimit = Spec.TargetTorqueNm * 1.10f;

	if (CurrentAppliedTorqueNm >= LowerLimit && CurrentAppliedTorqueNm <= UpperLimit)
	{
		bIsFullyTorqued = true;
		OutMessage = FText::FromString(FString::Printf(TEXT("Torqued to specification: %.1f N*m (Target: %.1f N*m)"), CurrentAppliedTorqueNm, Spec.TargetTorqueNm));
		return true;
	}
	else if (CurrentAppliedTorqueNm < LowerLimit)
	{
		bIsFullyTorqued = false;
		OutMessage = FText::FromString(FString::Printf(TEXT("Under-torqued: %.1f N*m (Target: %.1f N*m)"), CurrentAppliedTorqueNm, Spec.TargetTorqueNm));
		return true;
	}
	else
	{
		bIsFullyTorqued = true;
		OutMessage = FText::FromString(FString::Printf(TEXT("Above target but within yield: %.1f N*m"), CurrentAppliedTorqueNm));
		return true;
	}
}

void UFastenerComponent::Loosen()
{
	CurrentAppliedTorqueNm = 0.0f;
	bIsFullyTorqued = false;
}
