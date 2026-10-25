#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "FastenerComponent.generated.h"

UENUM(BlueprintType)
enum class EFastenerDriveType : uint8
{
	HexMetric UMETA(DisplayName = "Hex Metric"),
	Torx UMETA(DisplayName = "Torx"),
	AllenHexKey UMETA(DisplayName = "Allen Hex Key"),
	Phillips UMETA(DisplayName = "Phillips"),
	Slotted UMETA(DisplayName = "Slotted")
};

USTRUCT(BlueprintType)
struct FFastenerSpecification
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	EFastenerDriveType DriveType;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float NominalDiameterMm; // e.g. 10.0 for M10 (separate from socket size!)

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float ThreadPitchMm; // e.g. 1.5 mm (thread advance = pitch * turns)

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float EngagementLengthMm; // e.g. 20.0 mm total thread depth

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float SocketSizeMm; // e.g. 17.0 mm tool interface

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	FString FastenerMaterial; // e.g. "ISO 898-1 Property Class 8.8"

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float TargetTorqueNm; // e.g. 25.0 N*m for oil drain plug / oil filter

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float YieldTorqueLimitNm; // e.g. 45.0 N*m before bolt strips / yields

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fastener")
	float TorqueCoefficientK; // ~0.20 dry, ~0.15 lubricated

	FFastenerSpecification()
		: DriveType(EFastenerDriveType::HexMetric)
		, NominalDiameterMm(10.0f)
		, ThreadPitchMm(1.5f)
		, EngagementLengthMm(20.0f)
		, SocketSizeMm(17.0f)
		, FastenerMaterial(TEXT("ISO 898-1 Class 8.8 Steel"))
		, TargetTorqueNm(25.0f)
		, YieldTorqueLimitNm(45.0f)
		, TorqueCoefficientK(0.18f)
	{}
};

UCLASS(ClassGroup=(Mechverse), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UFastenerComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UFastenerComponent();

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fastener")
	FFastenerSpecification Spec;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fastener|State")
	float CurrentAppliedTorqueNm;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fastener|State")
	float CurrentEngagementMm;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fastener|State")
	bool bIsStrippedOrYielded;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fastener|State")
	bool bIsFullyTorqued;

	UFUNCTION(BlueprintCallable, Category = "Fastener|Physics")
	float CalculateClampingForceNewtons() const;

	UFUNCTION(BlueprintCallable, Category = "Fastener|Physics")
	float AdvanceThread(float Turns, FText& OutMessage);

	UFUNCTION(BlueprintCallable, Category = "Fastener|Interaction")
	bool ApplyTorque(float AppliedTorqueNm, FText& OutMessage);

	UFUNCTION(BlueprintCallable, Category = "Fastener|Interaction")
	void Loosen();

	UFUNCTION(BlueprintCallable, Category = "Fastener|Interaction")
	bool CanRemove(FText& OutReason) const;
};
