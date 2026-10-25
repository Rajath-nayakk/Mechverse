#include "MechanicalSystems/FastenerComponent.h"

UFastenerComponent::UFastenerComponent()
	: CurrentAppliedTorqueNm(0.0f)
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

	// Engineering Formula: F_clamp = T / (K * d)
	// where d is in meters (NominalDiameterMm / 1000.0)
	const float DiameterMeters = Spec.NominalDiameterMm / 1000.0f;
	if (DiameterMeters <= 0.0f || Spec.TorqueCoefficientK <= 0.0f)
	{
		return 0.0f;
	}

	return CurrentAppliedTorqueNm / (Spec.TorqueCoefficientK * DiameterMeters);
}

bool UFastenerComponent::ApplyTorque(float AppliedTorqueNm, FText& OutMessage)
{
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
